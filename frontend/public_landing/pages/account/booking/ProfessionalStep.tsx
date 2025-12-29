import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Star, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../../../src/services/api';

interface ProfessionalStepProps {
    selectedProfessionalId: number | null;
    professionalSelected: boolean;
    onProfessionalChange: (professional: any | null) => void;
    onContinue: () => void;
    salonSettings: any;
}

export function ProfessionalStep({
    selectedProfessionalId,
    professionalSelected,
    onProfessionalChange,
    onContinue,
    salonSettings
}: ProfessionalStepProps) {
    const { t } = useTranslation(['booking', 'common']);
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfessionals = async () => {
            setLoading(true);
            try {
                const res = await api.getUsers();
                const data = Array.isArray(res) ? res : (res.users || []);
                const filtered = data.filter((u: any) => u.role === 'employee' || u.is_service_provider);
                setProfessionals(filtered);
            } catch (error) {
                console.error('Failed to fetch professionals:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfessionals();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium tracking-tight">{t('booking.loading', 'Syncing masters...')}</p>
                </div>
            </div>
        );
    }

    const isAnyProfessional = professionalSelected && selectedProfessionalId === null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6"
            >
                <h2 className="text-2xl font-bold text-gray-900 leading-none">{t('booking.professional.title', 'Choose Master')}</h2>
            </motion.div>

            {/* Any Professional Option */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card
                    className={`cursor-pointer transition-all duration-300 rounded-2xl ${isAnyProfessional
                        ? 'border-purple-500 border-2 shadow-lg bg-purple-50/50'
                        : 'border hover:border-purple-200 hover:shadow-md'
                        }`}
                    onClick={() => onProfessionalChange(null)}
                >
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg">
                                ✨
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 leading-none mb-2">
                                    {t('booking.professional.anyAvailable', 'Flexible Match')}
                                </h3>
                                <p className="text-sm font-medium text-gray-500">
                                    {t('booking.professional.anyDesc', 'We\'ll match you with the best available professional')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Professionals List */}
            <div className="grid md:grid-cols-2 gap-4 pb-10">
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
                                className={`cursor-pointer transition-all duration-300 rounded-2xl ${isSelected
                                    ? 'border-purple-500 border-2 shadow-lg bg-purple-50/50'
                                    : 'border hover:border-purple-200 hover:shadow-md'
                                    }`}
                                onClick={() => onProfessionalChange(professional)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <Avatar className="w-16 h-16 rounded-2xl">
                                            <AvatarImage src={professional.photo} alt={professional.full_name} className="object-cover" />
                                            <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-xl">
                                                {professional.full_name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 leading-none mb-1">{professional.full_name}</h3>
                                            <p className="text-sm font-semibold text-purple-500 uppercase tracking-wider mb-3 leading-none italic">{professional.position}</p>

                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-lg">
                                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-sm font-bold text-yellow-700">{professional.rating || '5.0'}</span>
                                                </div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">({professional.reviews || 0} {t('booking.professional.reviews', 'Reviews')})</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-green-600 bg-green-50 w-fit px-3 py-1 rounded-full">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                                    {salonSettings?.timezone ? t('booking.professional.ready', 'Ready') : t('booking.professional.availableToday', 'Available Today')}
                                                </span>
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
            {(selectedProfessionalId !== null || professionalSelected) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-end mt-10"
                >
                    <Button
                        onClick={onContinue}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-14 px-12 rounded-2xl text-lg font-black shadow-xl"
                        size="lg"
                    >
                        {t('common.continue', 'Next step')}
                    </Button>
                </motion.div>
            )}
        </div>
    );
}
