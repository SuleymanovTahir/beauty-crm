import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';
import { CheckCircle2, Calendar, Clock, Phone, Loader2, Ticket, X } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { api } from '../../../../src/services/api';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { getLocalizedName, getDateLocale as getDateLocaleCentral } from '../../../../src/utils/i18nUtils';
import { useCurrency } from '../../../../src/hooks/useSalonSettings';
import { AuthPrompt } from './AuthPrompt';

interface ConfirmStepProps {
    bookingState: any;
    totalPrice: number;
    onPhoneChange: (phone: string) => void;
    onGuestInfoChange: (info: any) => void;
    onSuccess: () => void;
    salonSettings: any;
    setStep?: (step: string) => void;
    onOpenRescheduleDialog?: () => void;
}

export function ConfirmStep({
    bookingState,
    totalPrice,
    onPhoneChange,
    onGuestInfoChange,
    onSuccess,
    setStep,
    onOpenRescheduleDialog
}: ConfirmStepProps) {
    const { t, i18n } = useTranslation(['booking', 'common']);
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();
    const [phone, setPhone] = useState(bookingState.phone || user?.phone || '');
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);
    const [isGuestContinuing, setIsGuestContinuing] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [promoError, setPromoError] = useState('');
    const [validatingPromo, setValidatingPromo] = useState(false);


    // Автоматическая загрузка номера телефона из профиля
    useEffect(() => {
        const loadUserProfile = async () => {
            if (user && !profileLoaded) {
                try {
                    // Загрузить актуальный профиль пользователя
                    const response = await api.getClientProfile();
                    const profileData = response.profile;

                    // Если есть номер в профиле и его нет в bookingState
                    if (profileData?.phone && !bookingState.phone) {
                        setPhone(profileData.phone);
                        onPhoneChange(profileData.phone); // Обновить в bookingState
                    } else if (!profileData?.phone && !bookingState.phone) {
                        // Нет номера ни в профиле, ни в bookingState - показать модалку
                        setShowPhoneModal(true);
                    }

                    setProfileLoaded(true);
                } catch (error) {
                    console.error('Failed to load profile:', error);
                    // Если загрузка не удалась и номера нет - показать модалку
                    if (!bookingState.phone && !user.phone) {
                        setShowPhoneModal(true);
                    }
                    setProfileLoaded(true);
                }
            } else if (!user && !bookingState.phone && isGuestContinuing) {
                // Неавторизованный пользователь без номера, решивший продолжить как гость
                setShowPhoneModal(true);
                setProfileLoaded(true);
            } else {
                setProfileLoaded(true);
            }
        };

        loadUserProfile();
    }, [user, bookingState.phone, profileLoaded, onPhoneChange]);

    const handlePhoneSubmit = () => {
        if (!phone || phone.length < 5) { // Minimum phone length
            toast.error(t('invalid_phone', 'Please enter a valid phone number'));
            return;
        }
        onPhoneChange(phone);
        setShowPhoneModal(false);
    };

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setValidatingPromo(true);
        setPromoError('');
        try {
            const result: any = await api.validatePromoCode(promoCode, totalPrice);
            if (result.valid) {
                setAppliedPromo(result);
                toast.success(t('promotions.applied', 'Promo code applied!'));
            } else {
                setAppliedPromo(null);
                setPromoError(result.message || t('promotions.invalid', 'Invalid promo code'));
            }
        } catch (error) {
            setAppliedPromo(null);
            setPromoError(t('promotions.error', 'Error validating promo code'));
        } finally {
            setValidatingPromo(false);
        }
    };

    const removePromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
        setPromoError('');
    };

    const handleConfirm = async () => {
        if (!phone) {
            setShowPhoneModal(true);
            return;
        }

        setLoading(true);

        try {
            const dateStr = bookingState.date ? format(bookingState.date, 'yyyy-MM-dd') : '';
            const serviceNames = bookingState.services.map((s: any) => getLocalizedName(s, i18n.language)).join(', ');

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            try {
                if (bookingState.id) {
                    await api.put(`/ api / bookings / ${bookingState.id} `, {
                        service: serviceNames,
                        master: bookingState.professional?.username || 'any',
                        date: dateStr,
                        time: bookingState.time || '',
                        phone,
                        name: user?.full_name || user?.username || bookingState.name || 'Guest',
                        source: 'client_cabinet',
                        promo_code: appliedPromo?.code
                    });
                } else {
                    await api.createBooking({
                        instagram_id: user?.username || `web_${user?.id || 'guest'}_${Date.now()}`,
                        service: serviceNames,
                        master: bookingState.professional?.username || 'any',
                        date: dateStr,
                        time: bookingState.time || '',
                        phone,
                        name: user?.full_name || user?.username || bookingState.name || 'Guest',
                        source: 'client_cabinet',
                        promo_code: appliedPromo?.code
                    });
                }

                clearTimeout(timeoutId);
                toast.success(t('confirm.success', 'Booking confirmed!'));

                // Save phone to user profile if logged in
                if (user && phone && phone !== user.phone) {
                    try {
                        await api.updateClientProfile({ phone });
                    } catch (err) {
                        console.warn('Failed to update phone:', err);
                    }
                }

                // Redirect to appointments page after success (if user logged in)
                setTimeout(() => {
                    onSuccess();
                    if (user) {
                        window.location.href = '/account/appointments';
                    } else {
                        // For guests, we don't go to /account since it's restricted
                        // They've seen the success toast, and the modal will close via onClose in onSuccess wrapper
                        toast.info(t('auth.login_to_see_more', 'Login to manage your bookings'));
                    }
                }, 1000);
            } catch (fetchError: any) {
                clearTimeout(timeoutId);

                if (fetchError.name === 'AbortError') {
                    toast.error(t('confirm.timeout', 'Request timed out. Please try again.'));
                } else {
                    throw fetchError;
                }
            }
        } catch (error) {
            console.error('Booking error:', error);
            toast.error(t('confirm.error', 'Error creating booking. Please try again.'));
            setLoading(false);
        }
    };

    const dateLocale = getDateLocaleCentral(i18n.language);

    if (!user && !isGuestContinuing) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <AuthPrompt
                    onGuestContinue={() => setIsGuestContinuing(true)}
                    onAuthSuccess={(info) => {
                        onGuestInfoChange(info);
                        setIsGuestContinuing(true);
                        toast.success(t('auth.success_mock', 'Profile data received!'));
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="max-w-2xl mx-auto px-4 py-8 pb-32 w-full space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2"
                >
                    <h2 className="text-2xl font-bold text-gray-900">{t('confirm.title', 'Confirm Booking')}</h2>
                </motion.div>

                {/* Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-6 space-y-6">
                            {/* Services */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                        {t('menu.services', 'Services')}
                                    </p>
                                    {onOpenRescheduleDialog && (
                                        <button
                                            onClick={onOpenRescheduleDialog}
                                            className="text-xs text-gray-900 hover:text-gray-600 font-bold uppercase tracking-wide"
                                        >
                                            {t('common.edit', 'Edit')}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {bookingState.services.map((service: any) => (
                                        <div key={service.id} className="flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                                                <span className="text-gray-900 font-semibold">{getLocalizedName(service, i18n.language)}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-gray-400 font-medium whitespace-nowrap">
                                                    {service.duration} {t('min', 'min')}
                                                </span>
                                                <span className="font-bold text-gray-900">{formatCurrency(service.price)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Master */}
                            <div className="pt-6 border-t border-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                        {t('confirm.professional', 'Provider')}
                                    </p>
                                    {setStep && (
                                        <button
                                            onClick={() => setStep('professional')}
                                            className="text-xs text-gray-900 hover:text-gray-600 font-bold uppercase tracking-wide"
                                        >
                                            {t('common.change', 'Change')}
                                        </button>
                                    )}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-gray-900 font-semibold">
                                        {bookingState.professional ? getLocalizedName(bookingState.professional, i18n.language) : t('professional.anyAvailable', 'Flexible Match')}
                                    </p>
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="pt-6 border-t border-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                        {t('confirm.dateTime', 'Date & Time')}
                                    </p>
                                    {setStep && (
                                        <button
                                            onClick={() => setStep('datetime')}
                                            className="text-xs text-gray-900 hover:text-gray-600 font-bold uppercase tracking-wide"
                                        >
                                            {t('common.reschedule', 'Reschedule')}
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Calendar size={14} className="text-gray-400" />
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                                                {t('confirm.date', 'Date')}
                                            </span>
                                        </div>
                                        <p className="text-gray-900 font-semibold text-sm">
                                            {bookingState.date && format(bookingState.date, 'EEEE, MMM d', { locale: dateLocale })}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Clock size={14} className="text-gray-400" />
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                                                {t('confirm.time', 'Time')}
                                            </span>
                                        </div>
                                        <p className="text-gray-900 font-semibold text-sm">
                                            {bookingState.time}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Number */}
                            {phone && (
                                <div className="pt-6 border-t border-gray-50">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
                                        {t('confirm.contactNumber', 'Contact Number')}
                                    </p>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                                        <Phone size={16} className="text-gray-400" />
                                        <span className="text-gray-900 font-semibold">{phone}</span>
                                    </div>
                                </div>
                            )}

                            {/* Promo Code */}
                            <div className="pt-6 border-t border-gray-50">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
                                    {t('promotions.title', 'Promo Code')}
                                </p>
                                {appliedPromo ? (
                                    <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <Ticket className="w-4 h-4 text-green-600" />
                                            <div>
                                                <p className="font-bold text-green-700 text-sm">{appliedPromo.code}</p>
                                                <p className="text-xs text-green-600">
                                                    {appliedPromo.discount_type === 'percent'
                                                        ? `-${appliedPromo.value}%`
                                                        : `-${formatCurrency(appliedPromo.value)}`}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={removePromo} className="text-gray-400 hover:text-gray-600">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('promotions.enter_code', 'Enter code')}
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            className="uppercase"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={handleApplyPromo}
                                            disabled={validatingPromo || !promoCode}
                                        >
                                            {validatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apply', 'Apply')}
                                        </Button>
                                    </div>
                                )}
                                {promoError && (
                                    <p className="text-xs text-red-500 mt-1">{promoError}</p>
                                )}
                            </div>

                            {/* Total Amount */}
                            <div className="pt-6 border-t border-gray-50">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                                    {appliedPromo && (
                                        <>
                                            <div className="flex items-center justify-between text-sm text-gray-500">
                                                <span>{t('subtotal', 'Subtotal')}</span>
                                                <span className="line-through">{formatCurrency(totalPrice)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm text-green-600 font-medium">
                                                <span>{t('discount', 'Discount')}</span>
                                                <span>-{formatCurrency(totalPrice - (appliedPromo.final_price || totalPrice))}</span>
                                            </div>
                                            <div className="h-px bg-gray-200 my-2" />
                                        </>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('confirm.total', 'Total Amount')}</span>
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-gray-900">
                                                {formatCurrency(appliedPromo ? appliedPromo.final_price : totalPrice)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Confirm Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 lg:static lg:p-0 lg:bg-transparent lg:border-none"
                >
                    <div className="max-w-2xl mx-auto">
                        <Button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="w-full h-14 bg-gray-900 text-white hover:bg-gray-800 shadow-lg text-lg font-bold rounded-xl transition-all active:scale-[0.98]"
                            size="lg"
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{t('loading', 'Processing...')}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>{t('confirm.confirm', 'Confirm Appointment')}</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Phone Modal */}
            <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                    <div className="p-8 space-y-8 bg-white text-center">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                <Phone className="w-8 h-8 text-gray-900" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                                {t('confirm.phoneNeeded', 'Contact Information')}
                            </h2>
                            <p className="text-gray-500 font-medium text-sm">
                                {t('confirm.phoneDesc', 'Please provide your mobile number for appointment updates.')}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+7"
                                className="h-14 text-2xl font-bold text-center bg-gray-50 border-gray-100 focus-visible:ring-gray-200 rounded-xl"
                            />
                        </div>

                        <div className="flex gap-3 w-full">
                            <Button
                                variant="ghost"
                                onClick={() => setShowPhoneModal(false)}
                                className="flex-1 h-12 rounded-lg font-bold text-gray-400 hover:bg-gray-50 uppercase tracking-widest text-xs"
                            >
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button
                                onClick={handlePhoneSubmit}
                                className="flex-1 h-12 rounded-lg bg-gray-900 text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-800"
                            >
                                {t('common.save', 'Save')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
