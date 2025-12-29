import { useTranslation } from 'react-i18next';
import { BookingState, Service } from '../../App';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Scissors, User, Calendar, Check, ChevronRight, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface BookingMenuProps {
  bookingState: BookingState;
  onNavigate: (step: string) => void;
  totalDuration: number;
  totalPrice: number;
}

interface SalonSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export function BookingMenu({ bookingState, onNavigate, totalDuration, totalPrice }: BookingMenuProps) {
  const { t, i18n } = useTranslation();
  const [salonSettings, setSalonSettings] = useState<SalonSettings | null>(null);

  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6b68b787/salon/settings`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((res) => res.json())
      .then(setSalonSettings)
      .catch(console.error);
  }, []);

  const isServicesComplete = bookingState.services.length > 0;
  const isProfessionalComplete = bookingState.professionalId !== null;
  const isDateTimeComplete = bookingState.date !== null && bookingState.time !== null;
  const isAllComplete = isServicesComplete && isProfessionalComplete && isDateTimeComplete;

  const cards = [
    {
      id: 'services',
      icon: Scissors,
      title: t('booking.menu.services'),
      description: isServicesComplete
        ? `${bookingState.services.length} ${t('booking.menu.selected').toLowerCase()}`
        : t('booking.menu.selectServices'),
      isComplete: isServicesComplete,
      step: 'services',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      id: 'professional',
      icon: User,
      title: t('booking.menu.professional'),
      description: isProfessionalComplete
        ? t('booking.menu.completed')
        : t('booking.menu.selectProfessional'),
      isComplete: isProfessionalComplete,
      step: 'professional',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      id: 'datetime',
      icon: Calendar,
      title: t('booking.menu.datetime'),
      description: isDateTimeComplete
        ? `${bookingState.date} ${bookingState.time}`
        : t('booking.menu.selectDateTime'),
      isComplete: isDateTimeComplete,
      step: 'datetime',
      gradient: 'from-rose-500 to-orange-500',
    },
  ];

  const getServiceName = (service: Service) => {
    return service.name[i18n.language] || service.name.en;
  };

  return (
    <div className="space-y-6">
      {/* Salon Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{salonSettings?.name || t('salon.name')}</h2>
            <p className="text-gray-600 flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4" />
              {salonSettings?.address || t('salon.address')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Booking Steps */}
      <div className="grid md:grid-cols-3 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-200 overflow-hidden group"
                onClick={() => onNavigate(card.step)}
              >
                <div className={`h-2 bg-gradient-to-r ${card.gradient}`} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {card.isComplete && (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{card.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={card.isComplete ? 'default' : 'outline'} className={card.isComplete ? 'bg-green-500' : ''}>
                      {card.isComplete ? t('booking.menu.completed') : 'Select'}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      {isServicesComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('booking.confirm.summary')}</h3>
          
          <div className="space-y-3 mb-6">
            {bookingState.services.map((service) => (
              <div key={service.id} className="flex justify-between items-center">
                <span className="text-gray-700">{getServiceName(service)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{service.duration} {t('booking.min')}</span>
                  <span className="font-medium">${service.price}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 flex justify-between items-center mb-6">
            <div>
              <p className="text-gray-600">{t('booking.services.total')}</p>
              <p className="text-sm text-gray-500">{totalDuration} {t('booking.min')}</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">${totalPrice}</p>
          </div>

          {isAllComplete && (
            <Button
              onClick={() => onNavigate('confirm')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              {t('booking.menu.continue')}
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
