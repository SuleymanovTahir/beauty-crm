import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';
import { CheckCircle2, Calendar, Clock, User, Phone, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { api } from '../../../../src/services/api';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { getLocalizedName, getDateLocale as getDateLocaleCentral } from '../../../../src/utils/i18nUtils';

interface ConfirmStepProps {
    bookingState: any;
    totalPrice: number;
    onPhoneChange: (phone: string) => void;
    onSuccess: () => void;
    salonSettings: any;
}

export function ConfirmStep({
    bookingState,
    totalPrice,
    onPhoneChange,
    onSuccess,
    salonSettings
}: ConfirmStepProps) {
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
        if (!phone) {
            setShowPhoneModal(true);
            return;
        }

        setLoading(true);

        try {
            const dateStr = bookingState.date ? format(bookingState.date, 'yyyy-MM-dd') : '';
            const serviceNames = bookingState.services.map((s: any) => getLocalizedName(s, i18n.language)).join(', ');

            await api.createBooking({
                instagram_id: user?.username || `web_${user?.id || 'guest'}`,
                service: serviceNames,
                master: bookingState.professional?.username || 'any',
                date: dateStr,
                time: bookingState.time || '',
                phone,
                name: user?.full_name || user?.username || 'Guest'
            });

            toast.success(t('booking.confirm.success', 'Booking confirmed!'));
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (error) {
            console.error('Booking error:', error);
            toast.error(t('booking.confirm.error', 'Error creating booking'));
            setLoading(false);
        }
    };

    const dateLocale = getDateLocaleCentral(i18n.language);

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6"
            >
                <h2 className="text-2xl font-bold text-gray-900">{t('booking.confirm.title', 'Confirm Booking')}</h2>
            </motion.div>

            {/* Summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-5">
                        <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            {t('booking.confirm.summary', 'Order Summary')}
                        </h3>
                    </div>
                    <CardContent className="p-8 space-y-8 bg-white">
                        {/* Services */}
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t('booking.menu.services', 'Services')}</h4>
                            <div className="space-y-4">
                                {bookingState.services.map((service: any) => (
                                    <div key={service.id} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            <span className="text-gray-900 font-bold">{getLocalizedName(service, i18n.language)}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-gray-400 font-bold uppercase tracking-tighter">
                                                {service.duration} {t('booking.min', 'min')}
                                            </span>
                                            <span className="font-black text-gray-900">{service.price} {salonSettings?.currency || 'AED'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Professional */}
                        <div className="border-t border-gray-50 pt-8">
                            <div className="flex items-center gap-2 mb-4">
                                <User className="w-4 h-4 text-purple-600" />
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('booking.confirm.professional', 'Provider')}</h4>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-gray-900 font-black">
                                    {bookingState.professional ? getLocalizedName(bookingState.professional, i18n.language) : t('booking.professional.anyAvailable', 'Flexible Match')}
                                </p>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="border-t border-gray-50 pt-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calendar className="w-4 h-4 text-purple-600" />
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('booking.confirm.date', 'Date')}</h4>
                                    </div>
                                    <p className="text-gray-900 font-black bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {bookingState.date && format(bookingState.date, 'EEEE, MMM d', { locale: dateLocale })}
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('booking.confirm.time', 'Time')}</h4>
                                    </div>
                                    <p className="text-gray-900 font-black bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {bookingState.time}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="border-t border-gray-50 pt-8">
                            <div className="flex justify-between items-center bg-purple-50 p-6 rounded-2xl border border-purple-100">
                                <span className="text-xs font-black text-purple-600 uppercase tracking-[0.2em]">{t('booking.confirm.total', 'Total Amount')}</span>
                                <span className="text-3xl font-black text-gray-900">
                                    {totalPrice}
                                    <span className="text-sm font-bold text-gray-400 ml-2 uppercase">{salonSettings?.currency || 'AED'}</span>
                                </span>
                            </div>
                        </div>

                        {/* Phone */}
                        {phone && (
                            <div className="border-t border-gray-50 pt-8">
                                <div className="flex items-center gap-3 text-gray-500 bg-slate-50 p-4 rounded-xl border border-dashed border-gray-200">
                                    <Phone className="w-4 h-4" />
                                    <span className="font-black tracking-widest">{phone}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Confirm Button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="pb-20"
            >
                <Button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-2xl text-xl font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                    size="lg"
                >
                    {loading ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>{t('booking.loading', 'Processing...')}</span>
                        </div>
                    ) : (
                        <>
                            <CheckCircle2 className="w-6 h-6 mr-3" />
                            {t('booking.confirm.confirm', 'Confirm Appointment')}
                        </>
                    )}
                </Button>
            </motion.div>

            {/* Phone Modal */}
            <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                    <div className="p-10 space-y-10 bg-white">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Phone className="w-10 h-10 text-purple-600" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                                {t('booking.confirm.phoneNeeded', 'Stay Connected')}
                            </h2>
                            <p className="text-slate-400 font-medium leading-relaxed">
                                {t('booking.confirm.phoneDesc', 'Please provide your mobile number for appointment updates and verification.')}
                            </p>
                        </div>

                        <div className="space-y-4">
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
                                {t('common.cancel', 'Later')}
                            </Button>
                            <Button onClick={handlePhoneSubmit} className="flex-1 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 shadow-2xl text-white font-black uppercase tracking-widest text-xs">
                                {t('common.save', 'Verify')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
