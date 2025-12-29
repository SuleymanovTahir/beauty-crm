import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Service, Professional } from '../../App';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Star, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface ProfessionalStepProps {
  selectedProfessionalId: string | null;
  selectedServices: Service[];
  onProfessionalChange: (professionalId: string | null) => void;
  onContinue: () => void;
}

export function ProfessionalStep({
  selectedProfessionalId,
  selectedServices,
  onProfessionalChange,
  onContinue,
}: ProfessionalStepProps) {
  const { t } = useTranslation();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6b68b787/professionals`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfessionals(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch professionals:', error);
        setLoading(false);
      });
  }, []);

  const selectProfessional = (professionalId: string | null) => {
    onProfessionalChange(professionalId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('booking.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900">{t('booking.professional.title')}</h2>
      </motion.div>

      {/* Any Professional Option */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card
          className={`cursor-pointer transition-all duration-300 ${
            selectedProfessionalId === null
              ? 'border-purple-500 border-2 shadow-lg bg-purple-50/50'
              : 'border hover:border-purple-200 hover:shadow-md'
          }`}
          onClick={() => selectProfessional(null)}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                ✨
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('booking.professional.anyAvailable')}
                </h3>
                <p className="text-sm text-gray-600">
                  We'll match you with the best available professional
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Professionals List */}
      <div className="grid md:grid-cols-2 gap-4">
        {professionals.map((professional, index) => {
          const isSelected = selectedProfessionalId === professional.id;
          return (
            <motion.div
              key={professional.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 1) * 0.1 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'border-purple-500 border-2 shadow-lg bg-purple-50/50'
                    : 'border hover:border-purple-200 hover:shadow-md'
                }`}
                onClick={() => selectProfessional(professional.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={professional.avatar} alt={professional.name} />
                      <AvatarFallback>{professional.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{professional.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{professional.position}</p>
                      
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{professional.rating}</span>
                          <span className="text-sm text-gray-500">({professional.reviews} {t('booking.professional.reviews')})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">{t('booking.professional.availableToday')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Continue Button */}
      {selectedProfessionalId !== undefined && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <Button
            onClick={onContinue}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            {t('booking.professional.continue')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
