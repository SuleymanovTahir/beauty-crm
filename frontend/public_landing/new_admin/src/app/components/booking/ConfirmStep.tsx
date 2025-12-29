import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookingState } from '../../App';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { CheckCircle2, Calendar, Clock, User, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface ConfirmStepProps {
  bookingState: BookingState;
  totalDuration: number;
  totalPrice: number;
  onPhoneChange: (phone: string) => void;
  onSuccess: () => void;
}

export function ConfirmStep({
  bookingState,
  totalDuration,
  totalPrice,
  onPhoneChange,
  onSuccess,
}: ConfirmStepProps) {
  const { t, i18n } = useTranslation();
  const [phone, setPhone] = useState(bookingState.phone);
  const [showPhoneModal, setShowPhoneModal] = useState(!bookingState.phone);
  const [loading, setLoading] = useState(false);

  const getServiceName = (service: any) => {
    return service.name[i18n.language] || service.name.en;
  };

  const handlePhoneSubmit = () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
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
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6b68b787/booking/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            services: bookingState.services,
            professionalId: bookingState.professionalId,
            date: bookingState.date,
            time: bookingState.time,
            phone,
            duration: totalDuration,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(t('booking.confirm.success'));
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        toast.error(data.error || t('booking.confirm.error'));
        setLoading(false);
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(t('booking.confirm.error'));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900">{t('booking.confirm.title')}</h2>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
            <h3 className="text-white font-semibold">{t('booking.confirm.summary')}</h3>
          </div>
          <CardContent className="p-6 space-y-4">
            {/* Services */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">{t('booking.menu.services')}</h4>
              <div className="space-y-2">
                {bookingState.services.map((service) => (
                  <div key={service.id} className="flex justify-between items-center">
                    <span className="text-gray-700">{getServiceName(service)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {service.duration} {t('booking.min')}
                      </span>
                      <span className="font-medium">${service.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900">{t('booking.confirm.professional')}</h4>
              </div>
              <p className="text-gray-700">
                {bookingState.professionalId ? 'Selected Professional' : t('booking.confirm.anyProfessional')}
              </p>
            </div>

            {/* Date & Time */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900">{t('booking.confirm.date')}</h4>
              </div>
              <p className="text-gray-700">
                {bookingState.date && format(new Date(bookingState.date), 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <p className="text-gray-700">
                  {bookingState.time} ({totalDuration} {t('booking.min')})
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">{t('booking.confirm.total')}</span>
                <span className="text-2xl font-bold text-purple-600">${totalPrice}</span>
              </div>
            </div>

            {/* Phone */}
            {phone && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">{phone}</span>
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
      >
        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          size="lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{t('booking.loading')}</span>
            </div>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {t('booking.confirm.confirm')}
            </>
          )}
        </Button>
      </motion.div>

      {/* Phone Modal */}
      <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('booking.confirm.phone')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="tel"
              placeholder={t('booking.confirm.phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button onClick={handlePhoneSubmit} className="w-full">
              {t('booking.services.continue')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
