import { useState, useEffect } from "react";
import { Award, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "./ui/dialog";

export function MastersSection() {
    const { t, i18n } = useTranslation(['public_landing', 'common']);
    const language = i18n.language;
    const [selectedMaster, setSelectedMaster] = useState<number | null>(null);
    const [apiMasters, setApiMasters] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/employees')
            .then(res => res.json())
            .then(data => {
                const mastersList = Array.isArray(data) ? data.filter((m: any) => m.role === 'master') : [];
                setApiMasters(mastersList);
            })
            .catch(err => console.error('Error loading masters:', err));
    }, []);

    const defaultMasters = [
        {
            name: t('master1Name', { defaultValue: 'Анна Петрова' }),
            role: t('master1Role', { defaultValue: 'Мастер маникюра' }),
            experience: t('master1Exp', { defaultValue: '8 лет опыта' }),
            certification: t('master1Cert', { defaultValue: 'Международный сертификат' }),
            image: "https://images.unsplash.com/photo-1615562715183-9528405b75ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBiZWF1dHklMjBtYXN0ZXIlMjB3b21hbnxlbnwxfHx8fDE3NjQyMTgzMjd8MA&ixlib=rb-4.1.0&q=80&w=1080",
            certificates: [
                "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
                "https://images.unsplash.com/photo-1742415888265-d5044039d8e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBtYXN0ZXIlMjBjZXJ0aWZpY2F0ZXxlbnwxfHx8fDE3NjQyMTgyMzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
                "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
            ]
        },
        {
            name: t('master2Name', { defaultValue: 'Мария Иванова' }),
            role: t('master2Role', { defaultValue: 'Стилист-парикмахер' }),
            experience: t('master2Exp', { defaultValue: '10 лет опыта' }),
            certification: t('master2Cert', { defaultValue: 'Международный сертификат' }),
            image: "https://images.unsplash.com/photo-1737063935340-f9af0940c4c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyc3R5bGlzdCUyMHByb2Zlc3Npb25hbCUyMHdvbWFufGVufDF8fHx8MTc2NDIxODMyN3ww&ixlib=rb-4.1.0&q=80&w=1080",
            certificates: [
                "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
                "https://images.unsplash.com/photo-1742415888265-d5044039d8e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBtYXN0ZXIlMjBjZXJ0aWZpY2F0ZXxlbnwxfHx8fDE3NjQyMTgyMzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
            ]
        },
        {
            name: t('master3Name', { defaultValue: 'Елена Смирнова' }),
            role: t('master3Role', { defaultValue: 'Визажист' }),
            experience: t('master3Exp', { defaultValue: '6 лет опыта' }),
            certification: t('master3Cert', { defaultValue: 'Международный сертификат' }),
            image: "https://images.unsplash.com/photo-1600637070413-0798fafbb6c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWtldXAlMjBhcnRpc3QlMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY0MTQwNDY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
            certificates: [
                "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
                "https://images.unsplash.com/photo-1742415888265-d5044039d8e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBtYXN0ZXIlMjBjZXJ0aWZpY2F0ZXxlbnwxfHx8fDE3NjQyMTgyMzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
                "https://images.unsplash.com/photo-1617149897850-9b0dea0a2705?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXBsb21hJTIwY2VydGlmaWNhdGUlMjBhd2FyZHxlbnwxfHx8fDE3NjQyMTgzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
            ]
        }
    ];

    const masters = apiMasters.length > 0 ? apiMasters.map((m, idx) => ({
        name: m.name,
        role: m.specialization || defaultMasters[idx % 3].role,
        experience: `${m.experience || 5} ${t('yearsExperience', { defaultValue: 'лет опыта' })}`,
        certification: t('internationalCert', { defaultValue: 'Международный сертификат' }),
        image: m.photo_url || defaultMasters[idx % 3].image,
        certificates: defaultMasters[idx % 3].certificates
    })) : defaultMasters;

    return (
        <>
            <section className="py-24 px-6 lg:px-12 bg-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center mb-16">
                        <p className="text-[#b8a574] uppercase tracking-[0.2em] mb-4">{t('mastersTag', { defaultValue: 'НАША КОМАНДА' })}</p>
                        <h2 className="text-[#2d2d2d] mb-6">
                            {t('mastersTitle', { defaultValue: 'ПОЗНАКОМЬТЕСЬ С НАШИМИ МАСТЕРАМИ' })}
                        </h2>
                        <p className="text-[#6b6b6b] max-w-2xl mx-auto">
                            {t('mastersDesc', { defaultValue: 'Профессионалы с международными сертификатами и многолетним опытом' })}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        {masters.slice(0, 3).map((master, index) => (
                            <div key={index} className="group flex flex-col h-full">
                                {/* Image Container with forced 3:4 Aspect Ratio using inline style for reliability */}
                                <div
                                    className="relative w-full overflow-hidden rounded-2xl mb-6 flex-shrink-0"
                                    style={{ paddingTop: '133.33%' }}
                                >
                                    <img
                                        src={master.image}
                                        alt={master.name}
                                        className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>

                                <div className="text-center space-y-3 flex flex-col flex-grow">
                                    <h3 className="text-[#2d2d2d] tracking-wider">{master.name}</h3>
                                    <p className="text-[#b8a574] uppercase tracking-wider text-sm">{master.role}</p>
                                    <p className="text-[#6b6b6b] text-sm">{master.experience}</p>

                                    <div className="flex items-center justify-center gap-2 text-[#6b6b6b] text-sm">
                                        <Award className="w-4 h-4 text-[#b8a574]" />
                                        <span>{master.certification}</span>
                                    </div>

                                    <button
                                        onClick={() => setSelectedMaster(index)}
                                        className="mt-auto px-8 py-3 bg-transparent border-2 border-[#2d2d2d] text-[#2d2d2d] rounded-full hover:bg-[#2d2d2d] hover:text-white transition-all uppercase tracking-wider text-sm"
                                    >
                                        {t('viewCertificates', { defaultValue: 'Посмотреть сертификаты' })}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Dialog open={selectedMaster !== null} onOpenChange={() => setSelectedMaster(null)}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-none p-0">
                    {selectedMaster !== null && (
                        <div className="relative">
                            <button
                                onClick={() => setSelectedMaster(null)}
                                className="absolute top-4 right-4 z-50 p-2 bg-white/90 rounded-full hover:bg-white transition-colors shadow-lg"
                            >
                                <X className="w-5 h-5 text-[#2d2d2d]" />
                            </button>

                            <div className="p-8 lg:p-12">
                                <div className="flex flex-col md:flex-row gap-8 mb-12">
                                    <div className="md:w-1/3">
                                        <div className="relative overflow-hidden rounded-2xl aspect-[3/4]">
                                            <img
                                                src={masters[selectedMaster].image}
                                                alt={masters[selectedMaster].name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>

                                    <div className="md:w-2/3 flex flex-col justify-center">
                                        <h2 className="text-[#2d2d2d] mb-4 tracking-wider">
                                            {masters[selectedMaster].name}
                                        </h2>
                                        <p className="text-[#b8a574] uppercase tracking-wider mb-4">
                                            {masters[selectedMaster].role}
                                        </p>
                                        <p className="text-[#6b6b6b] mb-4">
                                            {masters[selectedMaster].experience}
                                        </p>
                                        <div className="flex items-center gap-2 text-[#6b6b6b]">
                                            <Award className="w-5 h-5 text-[#b8a574]" />
                                            <span>{masters[selectedMaster].certification}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[#2d2d2d] mb-8 tracking-wider text-center">
                                        {t('certificates', { defaultValue: 'Сертификаты' })}
                                    </h3>

                                    <div className="grid md:grid-cols-3 gap-6">
                                        {masters[selectedMaster].certificates.map((cert, idx) => (
                                            <div key={idx} className="relative overflow-hidden rounded-xl aspect-[3/4] bg-gray-100">
                                                <img
                                                    src={cert}
                                                    alt={`Certificate ${idx + 1}`}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-12 text-center">
                                    <button
                                        className="px-12 py-4 bg-[#2d2d2d] text-white rounded-full hover:bg-[#1a1a1a] transition-colors uppercase tracking-wider"
                                        onClick={() => {
                                            setSelectedMaster(null);
                                            document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        {t('bookNow', { defaultValue: 'Забронировать' })}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
